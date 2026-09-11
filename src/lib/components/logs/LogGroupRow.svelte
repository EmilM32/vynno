<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type { TaskGroup } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';
	import LogRow from './LogRow.svelte';

	const sessionStore = useSession();

	let {
		group,
		hideProject = false,
		onedit,
		ondelete
	}: {
		group: TaskGroup;
		hideProject?: boolean;
		onedit?: (session: TimeSession) => void;
		ondelete?: (session: TimeSession) => void;
	} = $props();

	const project = $derived(sessionStore.getProject(group.projectId));
	const count = $derived(group.sessions.length);
	const newest = $derived(group.sessions[0]);
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);
	const archived = $derived(Boolean(project?.isArchived));
	const restartDisabled = $derived(busy || archived);
	let open = $state(false);

	async function restart() {
		if (!newest) return;
		const ok = await sessionStore.restartFromTask({
			projectId: group.projectId,
			note: group.note,
			ticketId: group.ticketId,
			activityTypeId: newest.activityTypeId
		});
		if (ok) void goto(resolve('/timer'));
	}
</script>

<div class="flex flex-col gap-2" data-testid="log-group">
	<div
		class="group flex min-w-0 flex-col gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container md:flex-row md:items-center md:gap-6"
	>
		<div class="flex min-w-0 items-center justify-between gap-3 md:hidden">
			{#if !hideProject}
				<div class="flex min-w-0 items-center gap-2">
					<ColorDot color={project?.color ?? '#64748b'} />
					<span class="truncate text-body-sm text-on-surface"
						>{project?.name ?? m.common_unknown()}</span
					>
				</div>
			{/if}
			<div class="ml-auto font-mono text-code-data whitespace-nowrap text-on-surface">
				{formatCompact(group.totalMs)}
			</div>
		</div>

		{#if !hideProject}
			<div class="hidden min-w-[120px] shrink-0 md:flex">
				<div class="flex min-w-0 items-center gap-2">
					<ColorDot color={project?.color ?? '#64748b'} />
					<span class="truncate text-body-sm text-on-surface"
						>{project?.name ?? m.common_unknown()}</span
					>
				</div>
			</div>
		{/if}

		<div class="min-w-0 md:flex-1">
			<div class="truncate font-mono text-code-data text-on-surface-variant" title={group.note}>
				&gt; {group.note}
			</div>
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				{#if group.ticketId}
					<Chip variant="ticket">{group.ticketId}</Chip>
				{/if}
				<span
					class="font-mono text-code-label text-on-surface-variant"
					aria-label={m.logs_group_sessions_aria({ n: count })}
				>
					{m.logs_group_times({ n: count })}
				</span>
			</div>
		</div>

		<div class="hidden font-mono text-code-display whitespace-nowrap text-on-surface md:block">
			{formatCompact(group.totalMs)}
		</div>

		<div class="flex shrink-0 items-center justify-end gap-1.5 self-end md:self-center">
			<IconButton
				icon="play_arrow"
				label={m.logs_restart_aria({ note: group.note })}
				size="sm"
				class="opacity-100 transition-opacity group-focus-within:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
				disabled={restartDisabled}
				onclick={() => void restart()}
				title={busy
					? m.timer_stop_first()
					: archived
						? m.error_project_archived()
						: m.logs_restart_task()}
				data-testid="log-group-restart"
			/>
			<IconButton
				icon={open ? 'expand_less' : 'expand_more'}
				label={open ? m.logs_group_collapse() : m.logs_group_expand()}
				size="sm"
				aria-expanded={open}
				data-testid="log-group-expand"
				onclick={() => (open = !open)}
			/>
		</div>
	</div>

	{#if open}
		<div class="space-y-2 pl-3" data-testid="log-group-sessions">
			{#each group.sessions as session (session.id)}
				<LogRow
					{session}
					{hideProject}
					onedit={onedit ? () => onedit(session) : undefined}
					ondelete={ondelete ? () => ondelete(session) : undefined}
				/>
			{/each}
		</div>
	{/if}
</div>
