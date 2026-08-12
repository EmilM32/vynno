<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatCompact } from '$lib/time/duration';

	const items = $derived(sessionStore.recentTaskItems);
	const busy = $derived(!!sessionStore.activeSession);

	function restart(item: (typeof items)[number]) {
		sessionStore.restartFromTask({
			projectId: item.projectId,
			note: item.note,
			ticketId: item.ticketId,
			activityType: item.activityType,
			tags: item.tags
		});
	}
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
					<button
						type="button"
						class="group flex w-full items-center justify-between rounded border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
						disabled={busy}
						onclick={() => restart(item)}
						title={busy ? 'Stop the current session first' : 'Start this task'}
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
								class="material-symbols-outlined text-outline-variant opacity-40 transition-all group-hover:text-primary group-hover:opacity-100 group-disabled:opacity-30"
								aria-hidden="true">play_arrow</span
							>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
