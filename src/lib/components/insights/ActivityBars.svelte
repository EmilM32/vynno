<script lang="ts">
	import { OTHER_ID, topNWithOther } from '$lib/components/insights/legend';
	import { m } from '$lib/paraglide/messages.js';
	import { formatShare, isVisibleActivityRow, type NamedTotal } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';

	let {
		items,
		class: className
	}: {
		items: NamedTotal[];
		class?: string;
	} = $props();

	const visible = $derived(items.filter(isVisibleActivityRow));
	const rows = $derived(
		topNWithOther(visible).map((item) =>
			item.id === OTHER_ID ? { ...item, label: m.insights_other_projects() } : item
		)
	);
	const maxMs = $derived(Math.max(1, ...rows.map((i) => i.ms)));
</script>

<section
	class={[
		'flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container p-6',
		className ?? 'lg:h-96'
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
			{#if rows.length === 0}
				<p class="text-body-sm text-on-surface-variant">{m.insights_no_activity()}</p>
			{:else}
				{#each rows as item (item.id)}
					<div class="flex min-w-0 flex-col gap-1">
						<div class="flex min-w-0 items-center justify-between gap-2">
							<span class="min-w-0 truncate font-mono text-code-label text-on-surface"
								><bdi>{item.label}</bdi></span
							>
							<span class="font-mono text-code-label text-on-surface-variant">
								{formatCompact(item.ms)} · {formatShare(item)}
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
