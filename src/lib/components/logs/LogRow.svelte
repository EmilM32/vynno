<script lang="ts">
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatCompact, formatTimeRange, sessionElapsedMs } from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';

	let { session }: { session: TimeSession } = $props();

	const project = $derived(sessionStore.getProject(session.projectId));
	const duration = $derived(sessionElapsedMs(session));
	const range = $derived(formatTimeRange(session.startedAt, session.endedAt));
</script>

<div
	class="group flex flex-col justify-between gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container md:flex-row md:items-center md:gap-6"
>
	<div class="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
		<div class="flex min-w-[120px] items-center gap-2">
			<div
				class="h-2 w-2 shrink-0 rounded-full"
				style:background-color={project?.color ?? '#64748b'}
				aria-hidden="true"
			></div>
			<span class="truncate text-body-sm text-on-surface">{project?.name ?? 'Unknown'}</span>
		</div>
		<div
			class="min-w-0 flex-1 truncate font-mono text-code-data text-on-surface-variant"
			title={session.note}
		>
			&gt; {session.note}
		</div>
	</div>
	<div class="flex items-center gap-4 md:justify-end">
		{#if session.activityType}
			<div class="hidden gap-2 md:flex">
				<ActivityChip type={session.activityType} />
			</div>
		{/if}
		<div class="whitespace-nowrap font-mono text-code-data text-on-surface-variant">
			{range}
		</div>
		<div
			class="min-w-[80px] text-right font-mono text-code-display whitespace-nowrap text-on-surface"
		>
			{formatCompact(duration)}
		</div>
	</div>
</div>
