<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
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
		<h2 class="text-headline-md text-on-surface-variant">{m.timer_recent_tasks()}</h2>
		<span class="font-mono text-code-label text-outline">{m.timer_recent_search_hint()}</span>
	</div>

	{#if items.length === 0}
		<p class="py-4 text-center text-body-sm text-on-surface-variant">
			{m.timer_recent_empty()}
		</p>
	{:else}
		<ul class="flex flex-col gap-2" data-testid="recent-tasks">
			{#each items as item (item.sessionId)}
				{@const project = sessionStore.getProject(item.projectId)}
				<li>
					<button
						type="button"
						class="group flex w-full items-center justify-between rounded border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
						disabled={busy}
						onclick={() => restart(item)}
						title={busy ? m.timer_stop_first() : m.timer_start_this_task()}
						data-testid="recent-task-restart"
					>
						<div class="flex min-w-0 flex-col">
							<span
								class="truncate text-body-md text-on-surface transition-colors group-hover:text-primary"
								>{item.note}</span
							>
							<span class="font-mono text-code-label text-outline-variant">
								{m.timer_project_line({ name: project?.name ?? m.common_unknown() })}
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
