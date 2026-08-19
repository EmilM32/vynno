<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	const sessionStore = useSession();
	import { formatCompact } from '$lib/time/duration';

	const items = $derived(sessionStore.recentTaskItems);
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);

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

<div class="flex flex-col">
	<div class="mb-1 border-b border-outline-variant pb-2">
		<h2 class="text-headline-md text-on-surface">{m.timer_recent_tasks()}</h2>
	</div>

	{#if items.length === 0}
		<p class="py-4 text-center text-body-sm text-on-surface-variant">
			{m.timer_recent_empty()}
		</p>
	{:else}
		<ul data-testid="recent-tasks">
			{#each items as item (item.sessionId)}
				{const project = $derived(sessionStore.getProject(item.projectId))}
				<li class="border-b border-outline-variant last:border-b-0">
					<button
						type="button"
						class="focus-ring group flex w-full items-center justify-between py-2.5 text-left transition-colors hover:bg-surface-container/80 disabled:cursor-not-allowed disabled:opacity-60"
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
							<span class="font-mono text-code-label text-on-surface-variant">
								{project?.name ?? m.common_unknown()}
							</span>
						</div>
						<div class="flex shrink-0 items-center gap-3 pl-3">
							<span class="font-mono text-code-data text-on-surface-variant">
								{formatCompact(item.durationMs)}
							</span>
							<span
								class="material-symbols-outlined text-[18px] text-on-surface-variant transition-colors group-hover:text-primary group-disabled:opacity-50"
								aria-hidden="true">play_arrow</span
							>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
