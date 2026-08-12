<script lang="ts">
	import { formatCompact } from '$lib/time/duration';
	import type { NamedTotal } from '$lib/time/aggregates';

	let { items }: { items: NamedTotal[] } = $props();

	const maxMs = $derived(Math.max(1, ...items.map((i) => i.ms)));
</script>

<section
	class="flex h-96 flex-col rounded-lg border border-outline-variant bg-surface-container p-6"
	aria-label="Time by activity"
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-headline-md text-on-surface">Time by Activity</h2>
	</div>

	<div class="flex flex-1 flex-col justify-center gap-3">
		{#if items.length === 0}
			<p class="text-body-sm text-on-surface-variant">No activity data for this period.</p>
		{:else}
			{#each items as item (item.id)}
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between gap-2">
						<span class="font-mono text-code-label text-on-surface">{item.label}</span>
						<span class="font-mono text-code-label text-on-surface-variant">
							{formatCompact(item.ms)} · {item.percent}%
						</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-sm bg-surface-dim">
						<div
							class="h-full rounded-sm transition-all"
							style:width="{(item.ms / maxMs) * 100}%"
							style:background-color={item.color}
						></div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>
