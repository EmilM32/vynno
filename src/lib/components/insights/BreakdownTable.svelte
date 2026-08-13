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

	<div class="overflow-x-auto">
		<table class="w-full min-w-[28rem] border-collapse text-left">
			<caption class="sr-only">{m.insights_breakdown()}</caption>
			<thead>
				<tr
					class="border-b border-outline-variant bg-surface-container-low font-mono text-code-label text-on-surface-variant uppercase"
				>
					<th scope="col" class="px-4 py-2 font-medium">{m.insights_col_project()}</th>
					<th scope="col" class="hidden px-4 py-2 font-medium md:table-cell"
						>{m.insights_col_activity()}</th
					>
					<th scope="col" class="px-4 py-2 font-medium">{m.insights_col_duration()}</th>
					<th scope="col" class="px-4 py-2 text-right font-medium">%</th>
				</tr>
			</thead>
			<tbody>
				{#if rows.length === 0}
					<tr>
						<td colspan="4" class="p-4 text-body-sm text-on-surface-variant"
							>{m.insights_no_rows()}</td
						>
					</tr>
				{:else}
					{#each rows as row, i (row.projectId + row.activityType)}
						<tr
							class="transition-colors hover:bg-surface-container-high {i < rows.length - 1
								? 'border-b border-outline-variant'
								: ''}"
						>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2 font-mono text-code-data text-on-surface">
									<div
										class="h-2 w-2 shrink-0 rounded-full"
										style:background-color={row.projectColor}
										aria-hidden="true"
									></div>
									<span class="truncate">{row.projectName}</span>
								</div>
							</td>
							<td
								class="hidden px-4 py-3 font-mono text-code-label text-on-surface-variant md:table-cell"
							>
								{row.activityLabel}
							</td>
							<td class="px-4 py-3 font-mono text-code-data text-on-surface">
								{formatCompact(row.ms)}
							</td>
							<td class="px-4 py-3 text-right font-mono text-code-data text-on-surface-variant">
								{row.percent}%
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>
