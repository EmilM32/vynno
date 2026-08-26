<script lang="ts">
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatCompact, formatTimeRange, sessionElapsedMs } from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';

	const sessionStore = useSession();

	let {
		session,
		hideProject = false,
		onedit,
		ondelete
	}: {
		session: TimeSession;
		hideProject?: boolean;
		onedit?: () => void;
		ondelete?: () => void;
	} = $props();

	const project = $derived(sessionStore.getProject(session.projectId));
	const activity = $derived(
		session.activityTypeId ? sessionStore.getActivityType(session.activityTypeId) : undefined
	);
	const duration = $derived(sessionElapsedMs(session));
	const range = $derived(
		formatTimeRange(session.startedAt, session.endedAt, sessionStore.timeZone)
	);
</script>

{#snippet projectIdentity()}
	<div class="flex min-w-0 items-center gap-2">
		<ColorDot color={project?.color ?? '#64748b'} />
		<span class="truncate text-body-sm text-on-surface">{project?.name ?? m.common_unknown()}</span>
	</div>
{/snippet}

{#snippet timeCluster(className: string, durationClass: string)}
	<div class="flex shrink-0 items-center gap-3 {className}">
		<div class="font-mono text-code-data whitespace-nowrap text-on-surface-variant">
			{range}
		</div>
		<div class="font-mono text-code-data whitespace-nowrap text-on-surface {durationClass}">
			{formatCompact(duration)}
		</div>
	</div>
{/snippet}

<div
	class="group flex min-w-0 flex-col gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container md:flex-row md:items-center md:gap-6"
	data-testid="log-row"
>
	<div class="flex min-w-0 items-center justify-between gap-3 md:hidden">
		{#if !hideProject}
			{@render projectIdentity()}
		{/if}
		{@render timeCluster('ml-auto', '')}
	</div>

	{#if !hideProject}
		<div class="hidden min-w-[120px] shrink-0 md:flex">
			{@render projectIdentity()}
		</div>
	{/if}

	<div
		class="min-w-0 font-mono text-code-data break-words whitespace-normal text-on-surface-variant md:flex-1 md:truncate md:whitespace-nowrap"
		title={session.note}
	>
		&gt; {session.note}
	</div>

	<div class="hidden items-center gap-4 md:flex">
		{#if activity}
			<ActivityChip type={activity} />
		{/if}
		{@render timeCluster('', 'min-w-[80px] text-right text-code-display')}
	</div>

	{#if onedit || ondelete}
		<div class="flex shrink-0 items-center justify-end gap-1.5">
			{#if onedit}
				<Button variant="secondary" size="xs" onclick={onedit}>
					{m.logs_edit()}
				</Button>
			{/if}
			{#if ondelete}
				<Button variant="danger" size="xs" onclick={ondelete}>
					{m.logs_delete()}
				</Button>
			{/if}
		</div>
	{/if}
</div>
