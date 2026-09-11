<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
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
	const canRestart = $derived(session.status === 'stopped');
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);
	const archived = $derived(Boolean(project?.isArchived));
	const restartDisabled = $derived(busy || archived);

	async function restart() {
		const ok = await sessionStore.restartFromSession(session.id);
		if (ok) void goto(resolve('/timer'));
	}

	let noteExpanded = $state(false);
	let noteOverflows = $state(false);

	function watchOverflow(node: HTMLElement) {
		void session.note;
		const measure = () => {
			if (noteExpanded) return;
			noteOverflows =
				node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(node);
		return () => ro.disconnect();
	}
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

	<div class="min-w-0 md:flex-1">
		<div class="flex min-w-0 items-start gap-1">
			<div
				class={[
					'min-w-0 flex-1 font-mono text-code-data text-on-surface-variant',
					noteExpanded ? 'break-words whitespace-normal' : 'truncate'
				]}
				title={session.note}
				{@attach watchOverflow}
			>
				&gt; {session.note}
			</div>
			{#if noteExpanded || noteOverflows}
				<IconButton
					icon={noteExpanded ? 'expand_less' : 'expand_more'}
					label={noteExpanded ? m.logs_note_collapse() : m.logs_note_expand()}
					size="sm"
					aria-expanded={noteExpanded}
					data-testid="log-note-expand"
					onclick={() => (noteExpanded = !noteExpanded)}
				/>
			{/if}
		</div>
		{#if session.ticketId}
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				<Chip variant="ticket">{session.ticketId}</Chip>
			</div>
		{/if}
	</div>

	<div class="hidden items-center gap-4 md:flex">
		{#if activity}
			<ActivityChip type={activity} />
		{/if}
		{@render timeCluster('', 'min-w-[80px] text-right text-code-display')}
	</div>

	{#if canRestart || onedit || ondelete}
		<div class="flex shrink-0 items-center justify-end gap-1.5">
			{#if canRestart}
				<IconButton
					icon="play_arrow"
					label={m.logs_restart_aria({ note: session.note })}
					size="sm"
					class="opacity-100 transition-opacity group-focus-within:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
					disabled={restartDisabled}
					onclick={() => void restart()}
					title={busy
						? m.timer_stop_first()
						: archived
							? m.error_project_archived()
							: m.logs_restart_task()}
					data-testid="log-row-restart"
				/>
			{/if}
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
