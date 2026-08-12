<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatCompact } from '$lib/time/duration';

	const items = $derived(sessionStore.recentTaskItems);
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between border-b border-outline-variant pb-2">
		<h2 class="text-headline-md text-on-surface-variant">Recent Tasks</h2>
		<span class="font-mono text-code-label text-outline">Press [CMD+K] to search</span>
	</div>

	{#if items.length === 0}
		<p class="py-4 text-center text-body-sm text-on-surface-variant">
			No completed sessions yet. Start the timer to log work.
		</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each items as item (item.sessionId)}
				{@const project = sessionStore.getProject(item.projectId)}
				<li>
					<div
						class="group flex w-full items-center justify-between rounded border border-outline-variant bg-surface-container p-3 transition-colors hover:bg-surface-variant"
					>
						<div class="flex min-w-0 flex-col">
							<span
								class="truncate text-body-md text-on-surface transition-colors group-hover:text-primary"
								>{item.note}</span
							>
							<span class="font-mono text-code-label text-outline-variant">
								Project: {project?.name ?? 'Unknown'}
							</span>
						</div>
						<div class="flex shrink-0 items-center gap-3 pl-3">
							<span class="font-mono text-code-data text-on-surface-variant">
								{formatCompact(item.durationMs)}
							</span>
							<span
								class="material-symbols-outlined text-outline-variant opacity-40"
								title="Restart in Phase 3"
								aria-hidden="true">play_arrow</span
							>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
