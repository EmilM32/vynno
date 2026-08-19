<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type { RecentTask } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';

	let { items }: { items: RecentTask[] } = $props();

	const sessionStore = useSession();
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);

	async function restart(item: RecentTask) {
		const ok = await sessionStore.restartFromTask({
			projectId: item.projectId,
			note: item.note,
			ticketId: item.ticketId,
			activityType: item.activityType,
			tags: item.tags
		});
		if (ok) void goto(resolve('/timer'));
	}
</script>

<section
	class="flex flex-col rounded-lg border border-outline-variant bg-surface-container"
	aria-label={m.project_recent_logs_aria()}
>
	<div class="border-b border-outline-variant p-4">
		<h2 class="text-headline-md text-on-surface">{m.project_recent_logs()}</h2>
	</div>

	{#if items.length === 0}
		<p class="p-4 text-body-sm text-on-surface-variant">{m.project_recent_logs_empty()}</p>
	{:else}
		<ul>
			{#each items as item (item.sessionId)}
				<li class="border-b border-outline-variant last:border-b-0">
					<button
						type="button"
						class="focus-ring group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
						disabled={busy}
						onclick={() => void restart(item)}
						title={busy ? m.timer_stop_first() : m.timer_start_this_task()}
						data-testid="project-log-restart"
					>
						<div class="flex min-w-0 flex-col gap-0.5">
							<span
								class="truncate font-mono text-code-data text-on-surface-variant transition-colors group-hover:text-primary"
								>&gt; {item.note}</span
							>
							{#if item.ticketId}
								<span class="font-mono text-code-label text-primary">{item.ticketId}</span>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-3 pl-3">
							<span class="font-mono text-code-data text-on-surface-variant tabular-nums">
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
</section>
