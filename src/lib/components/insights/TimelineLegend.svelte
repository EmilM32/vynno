<script lang="ts">
	import { OTHER_ID, topNWithOther } from '$lib/components/insights/legend';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { formatShare } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';
	import type { ProjectTotal } from '$lib/time/timeline';

	let { totals }: { totals: ProjectTotal[] } = $props();

	const rows = $derived(
		topNWithOther(totals).map((row) =>
			row.id === OTHER_ID ? { ...row, label: m.insights_other_projects() } : row
		)
	);
</script>

<ul class="flex flex-wrap gap-x-4 gap-y-1.5" aria-label={m.insights_timeline_legend_aria()}>
	{#each rows as row (row.id)}
		<li class="flex min-w-0 items-center gap-2">
			<ColorDot color={row.color} size="md" />
			<span class="truncate text-body-sm text-on-surface"><bdi>{row.label}</bdi></span>
			<span class="font-mono text-code-label text-on-surface-variant tabular-nums">
				{formatCompact(row.ms)} · {formatShare(row)}
			</span>
		</li>
	{/each}
</ul>
