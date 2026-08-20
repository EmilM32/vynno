<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatClock, sessionElapsedMs } from '$lib/time/duration';

	const sessionStore = useSession();

	const logs = $derived(sessionStore.recentLogs);
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);

	async function restart(sessionId: string) {
		const ok = await sessionStore.restartFromSession(sessionId);
		if (ok) {
			void goto(resolve('/timer'));
		}
	}
</script>

<div
	class="flex flex-col rounded-lg border border-outline-variant bg-surface-container md:h-[300px]"
>
	<div class="flex items-center justify-between border-b border-outline-variant p-4">
		<h2 class="text-headline-md">{m.dashboard_recent_logs()}</h2>
	</div>

	<div class="md:no-scrollbar flex flex-1 flex-col gap-1 p-2 md:overflow-y-auto">
		{#if logs.length === 0}
			<p class="p-4 text-center text-body-sm text-on-surface-variant">
				{m.dashboard_no_completed()}
			</p>
		{:else}
			{#each logs as log (log.id)}
				{const project = $derived(sessionStore.getProject(log.projectId))}
				{const duration = $derived(sessionElapsedMs(log))}
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
							<span class="font-mono text-code-label text-[10px] text-on-surface-variant">
								{project?.name ?? m.common_unknown()}
							</span>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-2 pl-2">
						<span class="font-mono text-code-data text-on-surface tabular-nums">
							{formatClock(duration)}
						</span>
						<button
							type="button"
							class="focus-ring flex min-h-6 min-w-6 items-center justify-center rounded p-1 text-on-surface-variant opacity-100 transition-opacity group-focus-within:opacity-100 hover:text-primary focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 md:opacity-0 md:group-hover:opacity-100"
							disabled={busy}
							onclick={() => restart(log.id)}
							title={busy ? m.timer_stop_first() : m.dashboard_restart_task()}
							aria-label={m.dashboard_restart_aria({ note: log.note })}
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
