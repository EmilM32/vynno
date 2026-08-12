<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatClock, sessionElapsedMs } from '$lib/time/duration';

	const logs = $derived(sessionStore.recentLogs);
	const busy = $derived(!!sessionStore.activeSession);

	function restart(sessionId: string) {
		const ok = sessionStore.restartFromSession(sessionId);
		if (ok) {
			void goto(resolve('/timer'));
		}
	}
</script>

<div class="flex h-[300px] flex-col rounded-lg border border-outline-variant bg-surface-container">
	<div class="flex items-center justify-between border-b border-outline-variant p-4">
		<span class="text-headline-md">Recent Logs</span>
		<span class="text-on-surface-variant" aria-hidden="true">
			<span class="material-symbols-outlined text-[20px]">filter_list</span>
		</span>
	</div>

	<div class="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-2">
		{#if logs.length === 0}
			<p class="p-4 text-center text-body-sm text-on-surface-variant">No completed sessions yet.</p>
		{:else}
			{#each logs as log (log.id)}
				{@const project = sessionStore.getProject(log.projectId)}
				{@const duration = sessionElapsedMs(log)}
				<div
					class="group flex items-center justify-between rounded-DEFAULT border border-transparent p-2 transition-colors hover:border-outline-variant/50 hover:bg-surface-container-high"
				>
					<div class="flex min-w-0 items-center gap-3 overflow-hidden">
						<div
							class="h-2 w-2 shrink-0 rounded-full"
							style:background-color={project?.color ?? '#64748b'}
							aria-hidden="true"
						></div>
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-body-sm text-on-surface">{log.note}</span>
							<span class="font-mono text-[10px] text-code-label text-on-surface-variant">
								{project?.name ?? 'Unknown'}
							</span>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-2 pl-2">
						<span class="font-mono text-code-data tabular-nums text-on-surface">
							{formatClock(duration)}
						</span>
						<button
							type="button"
							class="rounded p-0.5 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
							disabled={busy}
							onclick={() => restart(log.id)}
							title={busy ? 'Stop the current session first' : 'Restart this task'}
							aria-label="Restart {log.note}"
						>
							<span class="material-symbols-outlined text-[16px]" aria-hidden="true"
								>play_arrow</span
							>
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
