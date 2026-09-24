<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatClock, sessionElapsedMs } from '$lib/time/duration';

	let { class: className }: { class?: string } = $props();

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
	class={[
		'flex max-h-56 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container md:h-75 md:max-h-none',
		className
	]}
>
	<div class="flex items-center justify-between border-b border-outline-variant p-4">
		<h2 class="text-headline-md">{m.dashboard_recent_logs()}</h2>
	</div>

	<div class="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
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
						<ColorDot color={project?.color ?? '#64748b'} />
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
						<span
							class={[
								'inline-flex transition-opacity',
								busy
									? 'opacity-100'
									: 'opacity-100 group-focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100'
							]}
						>
							<IconButton
								icon="play_arrow"
								label={busy ? m.timer_stop_first() : m.dashboard_restart_aria({ note: log.note })}
								size="sm"
								disabled={busy}
								onclick={() => restart(log.id)}
								title={busy ? m.timer_stop_first() : m.dashboard_restart_task()}
							/>
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
