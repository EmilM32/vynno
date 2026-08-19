<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { formatCompact } from '$lib/time/duration';
	import type { NamedTotal } from '$lib/time/aggregates';

	let {
		items,
		class: className
	}: {
		items: NamedTotal[];
		class?: string;
	} = $props();

	const maxMs = $derived(Math.max(1, ...items.map((i) => i.ms)));
</script>

<section
	class={[
		'flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container p-6',
		className ?? 'h-96'
	]}
	aria-label={m.insights_time_by_activity_aria()}
>
	<div class="mb-4 flex shrink-0 items-center justify-between">
		<h2 class="text-headline-md text-on-surface">{m.insights_time_by_activity()}</h2>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="min-h-0 flex-1 overflow-y-auto"
		tabindex="0"
		role="region"
		aria-label={m.insights_time_by_activity()}
	>
		<div class="flex min-h-full flex-col justify-center gap-3">
			{#if items.length === 0}
				<p class="text-body-sm text-on-surface-variant">{m.insights_no_activity()}</p>
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
								class="h-full rounded-sm transition-none"
								style:width="{(item.ms / maxMs) * 100}%"
								style:background-color={item.color}
							></div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</section>
