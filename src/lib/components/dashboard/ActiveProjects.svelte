<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatCompact } from '$lib/time/duration';

	const items = $derived(sessionStore.projectWeekSummaries);
</script>

<section
	class="flex flex-col rounded-lg border border-outline-variant bg-surface-container p-4"
	aria-label={m.dashboard_active_projects_aria()}
>
	<div class="mb-4 flex items-center justify-between">
		<span class="text-headline-md">{m.dashboard_active_projects()}</span>
		<span class="text-body-sm text-primary">{m.dashboard_this_week()}</span>
	</div>
	<div class="no-scrollbar -mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
		{#each items as item (item.project.id)}
			{@const pct = item.progressPercent ?? 0}
			<div
				class="flex min-w-[280px] shrink-0 cursor-default flex-col gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2">
						<div
							class="h-3 w-3 rounded-sm"
							style:background-color={item.project.color}
							aria-hidden="true"
						></div>
						<span class="text-body-md font-medium text-on-surface">{item.project.name}</span>
					</div>
					{#if item.progressPercent != null}
						<span class="font-mono text-code-data text-on-surface-variant">{pct}%</span>
					{/if}
				</div>
				{#if item.progressPercent != null}
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-dim">
						<div
							class="h-full rounded-full"
							style:width="{pct}%"
							style:background-color={item.project.color}
						></div>
					</div>
				{/if}
				<div class="mt-1 flex items-center justify-between">
					<span class="text-body-sm text-on-surface-variant">
						{m.dashboard_logged_this_week({ duration: formatCompact(item.ms) })}
					</span>
					<span class="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true"
						>arrow_forward</span
					>
				</div>
			</div>
		{/each}
	</div>
</section>
