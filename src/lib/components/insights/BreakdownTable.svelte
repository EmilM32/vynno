<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { formatShare, isVisibleActivityRow, type BreakdownRow } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';
	import { capBreakdown } from './breakdown';

	let { rows }: { rows: BreakdownRow[] } = $props();

	const tbodyId = $props.id();

	let expanded = $state(false);

	const visible = $derived(rows.filter(isVisibleActivityRow));
	const capped = $derived(capBreakdown(visible));
	const list = $derived(expanded ? visible : capped.shown);
	/** Collapsed and cut: one summary line stands in for the hidden rows. */
	const rest = $derived(expanded ? null : capped.rest);
</script>

<section
	class="mt-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
	aria-label={m.insights_breakdown_aria()}
>
	<div class="border-b border-outline-variant p-4">
		<h2 class="text-headline-md text-on-surface">{m.insights_breakdown()}</h2>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-0 border-collapse text-left md:min-w-md">
			<caption class="sr-only">{m.insights_breakdown()}</caption>
			<thead>
				<tr
					class="border-b border-outline-variant bg-surface-container-low font-mono text-code-label text-on-surface-variant uppercase"
				>
					<th scope="col" class="px-4 py-2 font-medium">{m.insights_col_project()}</th>
					<th scope="col" class="hidden px-4 py-2 font-medium md:table-cell"
						>{m.insights_col_activity()}</th
					>
					<th scope="col" class="px-4 py-2 font-medium whitespace-nowrap max-md:text-right">
						{m.insights_col_duration()}
					</th>
					<th scope="col" class="hidden px-4 py-2 text-right font-medium md:table-cell">%</th>
				</tr>
			</thead>
			<tbody id={tbodyId}>
				{#if visible.length === 0}
					<tr>
						<td colspan="4" class="p-4 text-body-sm text-on-surface-variant"
							>{m.insights_no_rows()}</td
						>
					</tr>
				{:else}
					{#each list as row, i (row.projectId + row.activityTypeId)}
						<tr
							class="transition-colors hover:bg-surface-container-high {i < list.length - 1 || rest
								? 'border-b border-outline-variant'
								: ''}"
						>
							<!--
								Phones: two columns (project, duration). The name may take two lines; activity
								and share follow under it. That line is a pseudo-element, so the text is not in
								the DOM twice (the Activity and % cells still carry it on desktop).
							-->
							<td class="px-4 py-3 max-md:w-full max-md:max-w-0">
								<a
									href={resolve(`/projects/${encodeURIComponent(row.projectId)}`)}
									class="focus-ring flex items-center gap-2 rounded-sm font-mono text-code-data text-on-surface hover:text-primary"
									aria-label={m.insights_open_project({ name: row.projectName })}
								>
									<ColorDot color={row.projectColor} />
									<span class="min-w-0 wrap-break-word max-md:line-clamp-2 md:truncate"
										><bdi>{row.projectName}</bdi></span
									>
								</a>
								<p
									class="mt-0.5 truncate pl-4 font-mono text-code-label text-on-surface-variant before:content-[attr(data-meta)] md:hidden"
									data-meta={`${row.activityLabel} · ${formatShare(row)}`}
								></p>
							</td>
							<td
								class="hidden px-4 py-3 font-mono text-code-label text-on-surface-variant md:table-cell"
							>
								<bdi>{row.activityLabel}</bdi>
							</td>
							<td
								class="px-4 py-3 align-top font-mono text-code-data whitespace-nowrap text-on-surface max-md:text-right md:align-middle"
							>
								{formatCompact(row.ms)}
							</td>
							<td
								class="hidden px-4 py-3 text-right font-mono text-code-data text-on-surface-variant md:table-cell"
							>
								{formatShare(row)}
							</td>
						</tr>
					{/each}
					{#if rest}
						<tr data-testid="breakdown-rest">
							<td
								class="px-4 py-3 font-mono text-code-label text-on-surface-variant max-md:w-full max-md:max-w-0"
							>
								{m.insights_breakdown_more({ count: rest.count })}
								<span
									class="block before:content-[attr(data-meta)] md:hidden"
									data-meta={formatShare(rest)}
								></span>
							</td>
							<td class="hidden px-4 py-3 md:table-cell"></td>
							<td
								class="px-4 py-3 align-top font-mono text-code-data whitespace-nowrap text-on-surface-variant max-md:text-right md:align-middle"
							>
								{formatCompact(rest.ms)}
							</td>
							<td
								class="hidden px-4 py-3 text-right font-mono text-code-data text-on-surface-variant md:table-cell"
							>
								{formatShare(rest)}
							</td>
						</tr>
					{/if}
				{/if}
			</tbody>
		</table>
	</div>

	{#if capped.rest}
		<div class="border-t border-outline-variant px-4 py-3">
			<Button
				variant="link"
				size="sm"
				aria-expanded={expanded}
				aria-controls={tbodyId}
				onclick={() => (expanded = !expanded)}
			>
				{expanded
					? m.insights_breakdown_show_fewer()
					: m.insights_breakdown_show_all({ count: visible.length })}
			</Button>
		</div>
	{/if}
</section>
